import { LevelExperience } from '../entity/levelExperience';
import { AppDataSource } from "../data-source";

export const ExperienceService = {
  async getAllLevels(): Promise<LevelExperience[]> {
    return AppDataSource.getRepository(LevelExperience).find({
      order: { level: 'ASC' },
    });
  }
}