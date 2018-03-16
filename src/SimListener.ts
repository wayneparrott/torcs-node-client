import { SimMessage } from './SimMessage';
import {SimMessageType} from "./SimMessageType";

export interface SimListener {
    handleMessage(msg: SimMessage): void;
}