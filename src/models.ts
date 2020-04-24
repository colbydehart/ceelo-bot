import { arrayProp, prop, getModelForClass } from '@typegoose/typegoose';

export class PlayerClass {
  @prop()
  public slackId?: string;
  @prop({ default: 0 })
  public total: number = 0;
}

export const Player = getModelForClass(PlayerClass);

class ScoreClass {
  @prop({ required: true })
  public playerSlackId: string = '';
  @prop({ default: null })
  public value: number | null = null;
}

export type GameState = 'created' | 'started' | 'finished' | null;

export class GameClass {
  @arrayProp({ items: ScoreClass })
  public scores: ScoreClass[] = [];
  @prop({ default: null })
  public state: GameState = null;
  @prop({ default: false })
  public open: boolean = false;
  @prop({ required: true })
  public messageTimestamp: string = '';
  @prop({ default: 0 })
  public stakes: number = 0;
  public get created() {
    return this.state !== null;
  }
  public get started() {
    return this.state !== null && this.state !== 'created';
  }
}

export const Game = getModelForClass(GameClass, {
  schemaOptions: { timestamps: true },
});

