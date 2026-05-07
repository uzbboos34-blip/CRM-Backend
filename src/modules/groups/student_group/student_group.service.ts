import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/database/prisma.service';
import { CreateStudentGroupDto } from './dto/create.dto';
import { Status } from '@prisma/client';
import { FindAllStudentGroupDto } from './dto/query.dto';

@Injectable()
export class StudentGroupService {
    constructor(private prisma: PrismaService) {}

    async create(payload: CreateStudentGroupDto) {
        const studentGroup = await this.prisma.studentGroup.findFirst({
            where: {
                student_id: payload.student_id,
                group_id: payload.group_id,
            },
        })

        if (studentGroup) {
            throw new ConflictException('Student group already exists');
        }
        const student = await this.prisma.students.findFirst({
            where: {
                id: payload.student_id,
            },
        })

        if (!student) {
            throw new NotFoundException('Student not found');
        }

        const group = await this.prisma.groups.findFirst({
            where: {
                id: payload.group_id,
            },
        })

        if (!group) {
            throw new NotFoundException('Group not found');
        }

        const count = await this.prisma.studentGroup.count({
            where: {
                student_id: payload.student_id
            },
        })

        if (count >= group.max_students) {
            throw new ConflictException(`Student already has ${group.max_students} groups`);
        }

        await this.prisma.studentGroup.create({
            data: payload,
        });

        return {
            success: true,
            message: 'Student group created successfully',
        };
    }

    async findAll(query:FindAllStudentGroupDto) { 
        const where : any = {};

        if (query.status) {
            where.status = query.status;
        }
        return await this.prisma.studentGroup.findMany({
            where,
            select: {
                id: true,
                students: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                        phone: true,
                        photo: true,
                        address: true,
                        birth_date: true,
                        status: true,
                    }
                },
                groups: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        start_date: true,
                        week_day: true,
                        start_time: true,
                        max_students: true,
                        status: true,
                        teachersGroups: {
                            select: {
                                teacher: {
                                    select: {
                                        id: true,
                                        full_name: true,
                                        email: true,
                                        phone: true,
                                        photo: true,
                                        address: true,
                                        status: true,
                                    }
                                }
                            }
                        },
                        course: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                price: true,
                                duration_month: true,
                                duration_hours: true,
                                status: true,
                            }
                        },
                        rooms:{
                            select: {
                                id: true,
                                name: true,
                                status: true,
                            }
                        }
                    }
                }
            }
        })
    }

    async findOne(id: number) {
        const studentGroup = await this.prisma.studentGroup.findFirst({
            where: { id },
            select: {
                id: true,
                students: {
                    select: {
                        id: true,
                        full_name: true,
                        email: true,
                        phone: true,
                        photo: true,
                        address: true,
                        birth_date: true,
                        status: true,
                    }
                },
                groups: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        start_date: true,
                        week_day: true,
                        start_time: true,
                        max_students: true,
                        status: true,
                        teachersGroups: {
                            select: {
                                teacher: {
                                    select: {
                                        id: true,
                                        full_name: true,
                                        email: true,
                                        phone: true,
                                        photo: true,
                                        address: true,
                                        status: true,
                                    }
                                }
                            }
                        },
                        course: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                price: true,
                                duration_month: true,
                                duration_hours: true,
                                status: true,
                            }
                        },
                        rooms:{
                            select: {
                                id: true,
                                name: true,
                                status: true,
                            }
                        }
                    }
                }
            }
        });

        if (!studentGroup) {
            throw new NotFoundException('Student group not found');
        }
        return {
            success: true,
            data: studentGroup,
        };
    }

    async update(id, payload){
        const studentGroup = await this.prisma.studentGroup.findFirst({
            where: {
                student_id: payload.student_id,
                group_id: payload.group_id,
            },
        })

        if (studentGroup) {
            throw new ConflictException('Student group already exists');
        }
        const student = await this.prisma.students.findFirst({
            where: {
                id: payload.student_id,
            },
        })

        if (!student) {
            throw new NotFoundException('Student not found');
        }

        const group = await this.prisma.groups.findFirst({
            where: {
                id: payload.group_id,
            },
        })

        if (!group) {
            throw new NotFoundException('Group not found');
        }

        await this.prisma.studentGroup.update({
            where: { id },
            data: payload,
        });
        return {
            success: true,
            message: 'Student group updated successfully',
        };
    }

    async remove(id){
        const studentGroup = await this.prisma.studentGroup.findUnique({
            where: { id },
        })
        if (studentGroup) {
            throw new NotFoundException('Student group not found');
        }
        await this.prisma.studentGroup.update({
            where: { id },
            data: {
                status: Status.inactive
            },
        })
        return {
            success: true,
            message: 'Student group deleted successfully',
        };
    }
}
