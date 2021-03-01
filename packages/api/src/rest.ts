import { GameOptions, GamePhase } from "./domain";
import * as zod from 'zod';

export interface GetGameDetails {
  phase: GamePhase;
  /**
   * A number between 0 and 1, indicating how far the playlist data has been downloaded so far
   */
  playlistDataDownloadProgress: number;
  options: GameOptions;
}

export const PostGameBodySchema = zod.object({
  code: zod.string()
})
export type PostGameBody = zod.TypeOf<typeof PostGameBodySchema>;

export interface PostGame {
  gameId: string;
  adminKey: string;
}
