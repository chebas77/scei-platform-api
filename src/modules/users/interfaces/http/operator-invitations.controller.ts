import { Body, Controller, Header, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequestMeta } from '../../../../shared/audit/audit-recorder.port';
import { ErrorCodes } from '../../../../shared/errors/error-codes';
import { ApiErrorResponses } from '../../../../shared/http/api-error-responses.decorator';
import { Public, ReqMeta } from '../../../../shared/security/decorators';
import { StrictThrottle } from '../../../../shared/security/throttle';
import { AcceptOperatorInvitationUseCase } from '../../application/accept-operator-invitation.use-case';
import { AcceptOperatorInvitationRequestDto } from './dto/users.request.dto';
import { AcceptOperatorInvitationResponseDto } from './dto/users.response.dto';

@ApiTags('Invitaciones')
@Controller('invitations/operator')
export class OperatorInvitationsController {
  constructor(private readonly accept: AcceptOperatorInvitationUseCase) {}

  @Public()
  @StrictThrottle()
  @Post('accept')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'El invitado acepta y define su propia clave' })
  @ApiOkResponse({ type: AcceptOperatorInvitationResponseDto })
  @ApiErrorResponses(ErrorCodes.VAL_INVALID_INPUT, ErrorCodes.AUTH_INVITATION_INVALID, ErrorCodes.AUTH_PASSWORD_WEAK, ErrorCodes.SYS_RATE_LIMITED)
  accepts(@Body() body: AcceptOperatorInvitationRequestDto, @ReqMeta() meta: RequestMeta): Promise<AcceptOperatorInvitationResponseDto> {
    return this.accept.execute(body, meta);
  }
}
