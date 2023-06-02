import { BrowserWindow } from 'electron';
import { IDisposable } from '../../../base/common/lifecycle';

export interface IChatEaseWindow extends IDisposable {
  readonly id: number;
  readonly win: BrowserWindow | null /* `null` after being disposed */;
}
