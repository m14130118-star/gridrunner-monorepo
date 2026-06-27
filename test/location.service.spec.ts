import { Test, TestingModule } from '@nestjs/testing';
import { LocationService } from '../src/player/services/location.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/player/entities/user.entity';
import { Vehicle } from '../src/player/entities/vehicle.entity';
import { Checkpoint } from '../src/player/entities/checkpoint.entity';
import { RedisService } from '../src/common/services/redis.service';
import { BadRequestException } from '@nestjs/common';

describe('LocationService', () => {
  let service: LocationService;

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockVehicleRepository = {
    findOne: jest.fn(),
  };

  const mockCheckpointRepository = {
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    }),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(Vehicle), useValue: mockVehicleRepository },
        { provide: getRepositoryToken(Checkpoint), useValue: mockCheckpointRepository },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);
  });

  it('should throw error on GPS jump', async () => {
    mockRedisService.get.mockResolvedValue(
      JSON.stringify([{ latitude: 55.751244, longitude: 37.618423, timestamp: Date.now() }]),
    );
    mockUserRepository.findOne.mockResolvedValue({ id: 1 });
    mockVehicleRepository.findOne.mockResolvedValue({ id: 1, speed_limit_kmh: 12 });

    await expect(
      service.updateLocation(1, {
        latitude: 55.751244 + 0.01, // 1 км прыжок
        longitude: 37.618423,
        vehicle_id: 1,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw error on speed limit exceed', async () => {
    mockRedisService.get.mockResolvedValue(
      JSON.stringify([
        { latitude: 55.751244, longitude: 37.618423, timestamp: Date.now() - 1000 },
        { latitude: 55.751244, longitude: 37.618423 + 0.01, timestamp: Date.now() }, // 1 км за 1 секунду
      ]),
    );
    mockUserRepository.findOne.mockResolvedValue({ id: 1 });
    mockVehicleRepository.findOne.mockResolvedValue({ id: 1, speed_limit_kmh: 12 });

    await expect(
      service.updateLocation(1, {
        latitude: 55.751244 + 0.02,
        longitude: 37.618423 + 0.02,
        vehicle_id: 1,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});