import { SimMessage } from './SimMessage';

export interface SimListener {
    handleMessage(msg: SimMessage): void;
}