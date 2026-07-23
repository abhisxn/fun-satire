export type Vec2 = { x: number; y: number };

export type ContentRef = {
  readonly manifestId: string;
  readonly rig: string;
  readonly renderType: string;
  readonly palette?: Readonly<Record<string, string>>;
};

export type PhysicsState = {
  pos: Vec2;
  vel: Vec2;
  home: Vec2;
  scale: number;
  rotation: number;
};

export type LifecycleState = {
  alive: boolean;
  dragged: boolean;
  dying: boolean;
  respawnAt: number | null;
};

export type BehaviorBag = {
  data: Record<string, unknown>;
};

export type EntityId = number;

export type Entity = {
  id: EntityId;
  content: ContentRef;
  physics: PhysicsState;
  behavior: BehaviorBag;
  lifecycle: LifecycleState;
};
