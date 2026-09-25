import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { UpdatePreferenceDto } from '@/preferences/dto/update-preference.dto';
import { PreferencesService } from '@/preferences/services/preferences.service';

@Controller('my-preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  listMine(@Req() request: AuthenticatedRequest) {
    return this.preferencesService.list(request.user.id);
  }

  @Patch('update-preference')
  @UseGuards(JwtAuthGuard)
  updateMine(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdatePreferenceDto,
  ) {
    return this.preferencesService.setEnabled(
      request.user.id,
      body.enabled,
      body.type,
    );
  }
}
