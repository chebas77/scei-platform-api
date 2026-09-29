import { ApiProperty } from '@nestjs/swagger';

export class EndpointResponseDto {
  @ApiProperty({ example: 'POST' }) method: string;
  @ApiProperty({ example: '/v1/platform/tenants' }) path: string;
}

export class PermissionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'tenants:create' }) code: string;
  @ApiProperty() description: string;
  @ApiProperty({ type: [EndpointResponseDto] }) endpoints: EndpointResponseDto[];
  @ApiProperty() isActive: boolean;
}

export class ModuleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'tenants' }) key: string;
  @ApiProperty({ example: 'Colegios' }) name: string;
  @ApiProperty({ nullable: true, type: String }) description: string | null;
  @ApiProperty({ enum: ['platform', 'tenant'] }) scope: 'platform' | 'tenant';
  @ApiProperty() isActive: boolean;
  @ApiProperty({ type: [PermissionResponseDto] }) permissions: PermissionResponseDto[];
}

export class RoleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true, type: String }) description: string | null;
  @ApiProperty({ enum: ['platform', 'tenant'] }) scope: 'platform' | 'tenant';
  @ApiProperty() isSystem: boolean;
  @ApiProperty({ description: 'Si es verdadero, sus módulos/permisos no se pueden cambiar (perdería la plataforma su único operador).' }) modulesLocked: boolean;
  @ApiProperty() requiresMfa: boolean;
  @ApiProperty() createdAt: string;
}

export class RoleSummaryResponseDto extends RoleResponseDto {
  @ApiProperty() moduleCount: number;
  @ApiProperty() permissionCount: number;
}

export class RoleDetailResponseDto extends RoleResponseDto {
  @ApiProperty({ type: [String] }) moduleIds: string[];
  @ApiProperty({ type: [String] }) permissionIds: string[];
  @ApiProperty({ type: [String], description: 'Unión de permisos por módulo y sueltos.' }) effectivePermissions: string[];
}

export class MyPermissionsTenantResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() slug: string;
  @ApiProperty() legalName: string;
}

export class MyPermissionsResponseDto {
  @ApiProperty({ type: [String], example: ['tenants:read', 'plans:read'] }) permissions: string[];
  @ApiProperty({ nullable: true, type: MyPermissionsTenantResponseDto, description: 'Colegio de estos permisos, o nulo si son de plataforma.' })
  tenant: MyPermissionsTenantResponseDto | null;
}
