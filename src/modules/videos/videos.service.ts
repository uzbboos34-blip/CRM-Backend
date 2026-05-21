import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "src/core/database/prisma.service";
import { CreateVideoDto } from "./dto/create-video.dto";
import { UserRole } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

@Injectable()
export class VideosService {
  constructor(private prisma: PrismaService) {}

  // Supabase-ni faqat kerak bo'lganda (lazily) ishga tushirish
  private getSupabaseClient() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;

    if (!url || !key) {
      throw new BadRequestException(
        "Supabase konfiguratsiyasi topilmadi. Iltimos, Render.com-da SUPABASE_URL va SUPABASE_KEY o'zgaruvchilarini sozlang.",
      );
    }

    return createClient(url, key);
  }

  async create(
    dto: CreateVideoDto,
    currentUser: { id: number; role: UserRole },
    video_file?: string,
    _file_size?: number,
  ) {
    const groupId = Number(dto.group_id);
    const lessonId = dto.lesson_id ? Number(dto.lesson_id) : null;

    // 1. Check group access for teacher
    if (currentUser.role === UserRole.TEACHER) {
      const access = await this.prisma.teachersGroup.findFirst({
        where: { teacher_id: currentUser.id, group_id: groupId },
      });
      if (!access) throw new ForbiddenException("Bu guruhga ruxsatingiz yo'q");
    }

    // 2. Get actual file size if saved to disk and upload to Supabase
    let actualSize: bigint | null = dto.file_size
      ? BigInt(dto.file_size)
      : null;
    let finalUrl = dto.video_url || "";

    if (video_file) {
      const filePath = path.join("./src/uploads", video_file);
      try {
        const stat = fs.statSync(filePath);
        actualSize = BigInt(stat.size);

        // Read file as Buffer for uploading
        const fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(video_file).toLowerCase();

        // Define correct mime type
        let contentType = "video/mp4";
        if (ext === ".mov") contentType = "video/quicktime";
        else if (ext === ".avi") contentType = "video/x-msvideo";
        else if (ext === ".mkv") contentType = "video/x-matroska";

        // Lazy initialization
        const supabase = this.getSupabaseClient();

        // Upload to Supabase Storage using 'NajotEdu' bucket
        const { error: uploadError } = await supabase.storage
          .from("NajotEdu")
          .upload(video_file, fileBuffer, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          throw new Error(
            `Supabase Storage yuklash xatosi: ${uploadError.message}`,
          );
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from("NajotEdu")
          .getPublicUrl(video_file);

        finalUrl = publicUrlData.publicUrl;

        // Delete temporary file from disk immediately to save space
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error("Vaqtinchalik faylni o'chirishda xatolik:", e);
        }
      } catch (err) {
        // Safe clean up in case of any failures
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch {
          // ignore clean up error
        }

        // Xatolikni chiroyli ko'rinishda brauzerga qaytarish
        throw new BadRequestException(
          (err as any).message || "Video yuklash jarayonida xatolik yuz berdi",
        );
      }
    }

    // 3. Create video database record with Supabase URL
    const data = await this.prisma.videos.create({
      data: {
        title: dto.title,
        description: dto.description,
        video_url: finalUrl,
        file_size: actualSize,
        group_id: groupId,
        lesson_id: lessonId,
        teacher_id:
          currentUser.role === UserRole.TEACHER ? currentUser.id : null,
        user_id: currentUser.role !== UserRole.TEACHER ? currentUser.id : null,
      },
      include: {
        lessons: { select: { id: true, topic: true, date: true } },
      },
    });
    return {
      success: true,
      data: {
        ...data,
        file_size: data.file_size ? data.file_size.toString() : null,
      },
    };
  }

  async findAllByGroup(
    groupId: number,
    currentUser: { id: number; role: UserRole },
  ) {
    // Check access
    if (currentUser.role === UserRole.TEACHER) {
      const access = await this.prisma.teachersGroup.findFirst({
        where: { teacher_id: currentUser.id, group_id: groupId },
      });
      if (!access) throw new ForbiddenException("Bu guruhga ruxsatingiz yo'q");
    }

    const videos = await this.prisma.videos.findMany({
      where: { group_id: groupId },
      orderBy: { created_at: "desc" },
      include: {
        lessons: { select: { id: true, topic: true, date: true } },
      },
    });

    // Convert BigInt to string for JSON serialization
    const serialized = videos.map((v) => ({
      ...v,
      file_size: v.file_size ? v.file_size.toString() : null,
    }));

    return { success: true, data: serialized };
  }

  async remove(id: number, currentUser: { id: number; role: UserRole }) {
    const video = await this.prisma.videos.findUnique({ where: { id } });
    if (!video) throw new NotFoundException("Video topilmadi");

    // Check ownership/permission
    if (currentUser.role === UserRole.TEACHER) {
      if (video.teacher_id !== currentUser.id) {
        throw new ForbiddenException("Siz bu videoni o'chira olmaysiz");
      }
    }

    // Delete from Supabase Storage if it's stored there
    if (video.video_url && video.video_url.includes("supabase.co/storage")) {
      try {
        const supabase = this.getSupabaseClient();
        const parts = video.video_url.split("/");
        const filename = parts[parts.length - 1];
        if (filename) {
          await supabase.storage.from("NajotEdu").remove([filename]);
        }
      } catch (e) {
        console.error("Supabase-dan faylni o'chirishda xatolik:", e);
      }
    }

    // Delete local physical file if exists (for old videos)
    if (video.video_url && !video.video_url.startsWith("http")) {
      const filePath = path.join("./src/uploads", video.video_url);
      try {
        fs.unlinkSync(filePath);
      } catch {
        /* ignore */
      }
    }

    await this.prisma.videos.delete({ where: { id } });
    return { success: true, message: "Video o'chirildi" };
  }
}
