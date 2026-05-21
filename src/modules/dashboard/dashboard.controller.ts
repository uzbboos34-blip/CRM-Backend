import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { Roles } from "src/common/decorators/roles";
import { UserRole } from "@prisma/client";
import { TokenGuard } from "src/common/guards/token.guards";
import { RolesGuard } from "src/common/guards/role.guards";

@ApiTags("Dashboard")
@ApiBearerAuth()
@Controller("dashboard")
@UseGuards(TokenGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({
    summary:
      "Dashboard statistikasini olish (Barcha admin/o'qituvchilar uchun)",
  })
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @Get("stats")
  getStats() {
    return this.dashboardService.getStats();
  }
}
