import { CoreySprite } from './CoreySprite';
import { LevSprite } from './LevSprite';
import { ScoutSprite } from './ScoutSprite';
import { QuillSprite } from './QuillSprite';
import { EmberSprite } from './EmberSprite';
import { ForgeSprite } from './ForgeSprite';
import { PixelSprite } from './PixelSprite';
import { GavinSprite } from './GavinSprite';
import { TristanSprite } from './TristanSprite';

type SpriteComponent = () => JSX.Element;

export const SPRITE_MAP: Record<string, SpriteComponent> = {
  corey:   CoreySprite,
  lev:     LevSprite,
  scout:   ScoutSprite,
  quill:   QuillSprite,
  ember:   EmberSprite,
  forge:   ForgeSprite,
  pixel:   PixelSprite,
  gavin:   GavinSprite,
  tristan: TristanSprite,
};

// All sprites: 16×20 at P=3 = 48×60px. visibleH=42 → bottom 18px behind desk surface.
export const SPRITE_DIMS: Record<string, { w: number; h: number; visibleH: number }> = {
  _default: { w: 48, h: 60, visibleH: 42 },
};
