import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ApiTags, DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Get, ValidationPipe } from "@nestjs/common";
import * as express from "express";
import { join } from "path";
import * as fs from "fs";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400, // 24 hours
  });

  app.use("/file", (req, res, next) => {
    const filename = req.path.replace(/^\//, "");
    if (!filename) {
      return res.status(404).send("File not found");
    }
    const localPath = join(process.cwd(), "src", "uploads", filename);
    if (fs.existsSync(localPath)) {
      return res.sendFile(localPath);
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    if (supabaseUrl) {
      const redirectUrl = `${supabaseUrl}/storage/v1/object/public/NajotEdu/${filename}`;
      return res.redirect(redirectUrl);
    }

    return res.status(404).send("File not found");
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix("api/v1");

  const config = new DocumentBuilder()
    .setTitle("CRM N26 GROUP")
    .addBearerAuth()
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("swagger", app, documentFactory, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
