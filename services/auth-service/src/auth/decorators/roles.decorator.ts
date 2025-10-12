/**
 * Roles Decorator
 * Defines required roles for accessing a route
 */

import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@mediconnect/types';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
