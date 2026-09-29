import { Body, Controller, Header, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequestMeta } from '../../../../shared/audit/audit-recorder.port';
import { ErrorCodes } from '../../../../shared/errors/error-codes';
import { ApiErrorResponses } from '../../../../shared/http/api-error-responses.decorator';
import { Public, ReqMeta } from '../../../../shared/security/decorators';
import { StrictThrottle } from '../../../../shared/security/throttle';
import { AcceptInvitationUseCase } from '../../application/accept-invitation.use-case';
import { AcceptInvitationRequestDto } from './dto/tenants.request.dto';
import { AcceptInvitationResponseDto } from './dto/tenants.response.dto';

@ApiTags('Invitaciones')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly accept: AcceptInvitationUseCase) {}

  @Public()
  @StrictThrottle()
  @Post('accept')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'El administrador del colegio acepta su invitación y define su clave' })
  @ApiOkResponse({ type: AcceptInvitationResponseDto })
  @ApiErrorResponses(ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.AUTH_INVITATION_INVALID, ErrorCodes.AUTH_PASSWORD_WEAK, ErrorCodes.SYS_RATE_LIMITED)
  accepts(@Body() body: AcceptInvitationRequestDto, @ReqMeta() meta: RequestMeta): Promise<AcceptInvitationResponseDto> {
    return this.accept.execute(body, meta);
  }
}
