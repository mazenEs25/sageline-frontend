import { Pipe, PipeTransform } from '@angular/core';
import { User } from '../../models/user.model';

@Pipe({ name: 'roleFilter' })
export class RoleFilterPipe implements PipeTransform {
  transform(users: User[], role: string): User[] {
    if (!users) return [];
    return users.filter(u => u.role === role);
  }
}
