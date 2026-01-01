export type Vector2D = {
  x: number;
  y: number;
};

export type PhysicsBody = {
  position: Vector2D;
  velocity: Vector2D;
  acceleration: Vector2D;
  maxSpeed: number;
  friction: number;
  radius: number;  // for collision
};

export const createBody = (
  x: number, 
  y: number, 
  maxSpeed: number = 5,
  radius: number = 1
): PhysicsBody => ({
  position: { x, y },
  velocity: { x: 0, y: 0 },
  acceleration: { x: 0, y: 0 },
  maxSpeed,
  friction: 0.92,
  radius,
});

export const applyForce = (body: PhysicsBody, force: Vector2D): void => {
  body.acceleration.x += force.x;
  body.acceleration.y += force.y;
};

export const updateBody = (body: PhysicsBody, deltaTime: number): void => {
  const dt = deltaTime / 16.67;  // normalize to ~60fps
  
  // Apply acceleration to velocity
  body.velocity.x += body.acceleration.x * dt;
  body.velocity.y += body.acceleration.y * dt;
  
  // Apply friction
  body.velocity.x *= body.friction;
  body.velocity.y *= body.friction;
  
  // Clamp to max speed
  const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
  if (speed > body.maxSpeed) {
    body.velocity.x = (body.velocity.x / speed) * body.maxSpeed;
    body.velocity.y = (body.velocity.y / speed) * body.maxSpeed;
  }
  
  // Update position
  body.position.x += body.velocity.x * dt;
  body.position.y += body.velocity.y * dt;
  
  // Reset acceleration
  body.acceleration.x = 0;
  body.acceleration.y = 0;
};

export const checkCollision = (a: PhysicsBody, b: PhysicsBody): boolean => {
  const dx = a.position.x - b.position.x;
  const dy = a.position.y - b.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < (a.radius + b.radius);
};

export const distance = (a: Vector2D, b: Vector2D): number => {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
};

export const normalize = (v: Vector2D): Vector2D => {
  const mag = Math.sqrt(v.x ** 2 + v.y ** 2);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: v.x / mag, y: v.y / mag };
};

export const moveToward = (
  current: Vector2D, 
  target: Vector2D, 
  speed: number
): Vector2D => {
  const dir = normalize({ x: target.x - current.x, y: target.y - current.y });
  return {
    x: current.x + dir.x * speed,
    y: current.y + dir.y * speed,
  };
};