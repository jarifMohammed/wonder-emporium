import { DeleteAccountUseCase } from './delete-account.use-case';
import type { IAuthUserRepository } from '../../domain/interfaces/auth-user.repository.interface';
import type { IPasswordHasher } from '../../../common/domain/interfaces/password-hasher.interface';
import { AuthUser } from '../../domain/entities/auth-user.entity';
import { userRole } from '../../interfaces/auth.interface';
import { AppError } from '../../../common/errors/app.error';

describe('DeleteAccountUseCase', () => {
  let useCase: DeleteAccountUseCase;
  let mockUserRepo: jest.Mocked<IAuthUserRepository>;
  let mockHasher: jest.Mocked<IPasswordHasher>;

  const mockUser = new AuthUser(
    'user-uuid-1',
    'test@example.com',
    'hashedPassword123',
    'testuser',
    userRole.USER,
    true,
    'ACTIVE',
    1,
    'local',
    null,
    new Date(),
    new Date(),
    null,
    false,
  );

  beforeEach(() => {
    mockUserRepo = {
      findById: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<IAuthUserRepository>;

    mockHasher = {
      compare: jest.fn(),
      hash: jest.fn(),
    };

    useCase = new DeleteAccountUseCase(mockUserRepo, mockHasher);
  });

  it('should delete account successfully without password', async () => {
    mockUserRepo.findById.mockResolvedValue(mockUser);
    mockUserRepo.softDelete.mockResolvedValue();

    const result = await useCase.execute('user-uuid-1');

    expect(mockUserRepo.findById).toHaveBeenCalledWith('user-uuid-1');
    expect(mockUserRepo.softDelete).toHaveBeenCalledWith('user-uuid-1');
    expect(result).toEqual({ message: 'Account deleted successfully' });
  });

  it('should delete account successfully when correct password is provided', async () => {
    mockUserRepo.findById.mockResolvedValue(mockUser);
    mockHasher.compare.mockResolvedValue(true);
    mockUserRepo.softDelete.mockResolvedValue();

    const result = await useCase.execute('user-uuid-1', 'correctPassword');

    expect(mockHasher.compare).toHaveBeenCalledWith(
      'correctPassword',
      mockUser.password,
    );
    expect(mockUserRepo.softDelete).toHaveBeenCalledWith('user-uuid-1');
    expect(result).toEqual({ message: 'Account deleted successfully' });
  });

  it('should throw badRequest when incorrect password is provided', async () => {
    mockUserRepo.findById.mockResolvedValue(mockUser);
    mockHasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute('user-uuid-1', 'wrongPassword'),
    ).rejects.toThrow(AppError);

    expect(mockUserRepo.softDelete).not.toHaveBeenCalled();
  });

  it('should throw notFound if user does not exist', async () => {
    mockUserRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('non-existent-id')).rejects.toThrow(AppError);

    expect(mockUserRepo.softDelete).not.toHaveBeenCalled();
  });
});
