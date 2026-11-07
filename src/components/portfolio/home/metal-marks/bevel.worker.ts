/**
 * Off-main-thread bevel solver (EF-06): receives a mark's alpha raster, answers with its RG8 field.
 * Loaded as a module worker by `field.ts`; transfers buffers both ways.
 */
import { bevelField, type BevelOptions } from './bevel';

export interface BevelRequest {
  id: number;
  width: number;
  height: number;
  alpha: Uint8Array;
  options: BevelOptions;
}

export interface BevelResponse {
  id: number;
  width: number;
  height: number;
  texels: Uint8Array;
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<BevelRequest>) => void) | null;
  postMessage(message: BevelResponse, transfer: Transferable[]): void;
};

scope.onmessage = (event) => {
  const { id, width, height, alpha, options } = event.data;
  const texels = bevelField(alpha, width, height, options);
  scope.postMessage({ id, width, height, texels }, [texels.buffer]);
};
