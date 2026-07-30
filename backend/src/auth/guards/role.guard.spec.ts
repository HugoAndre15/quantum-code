import { RoleGuard } from './role.guard';

describe('RoleGuard', () => {
  it('allows a public handler declared inside a role-protected controller', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    };
    const guard = new RoleGuard(reflector as never);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    };

    expect(guard.canActivate(context as never)).toBe(true);
  });
});
