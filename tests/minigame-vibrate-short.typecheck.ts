import { IMiniCommon, VibrateShortType } from "../MiniGame";

declare const common: IMiniCommon;

const defaultType: VibrateShortType = "medium";
const lightType: VibrateShortType = "light";
const heavyType: VibrateShortType = "heavy";

common.vibrateShort();
common.vibrateShort(defaultType);
common.vibrateShort(lightType);
common.vibrateShort(heavyType);

// @ts-expect-error Only documented vibration intensities are accepted.
common.vibrateShort("strong");
