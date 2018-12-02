'use strict';

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  plus(vector) {
    if (!(vector instanceof Vector)) {
      throw new Error(`В метод plus передан не вектор`);
    }
    const addX = this.x + vector.x;
    const addY = this.y + vector.y;
    return new Vector(addX, addY); 
  }

  times(factor) {
    const addX = this.x * factor;
    const addY = this.y * factor;
    return new Vector(addX, addY); 
  }
}

class Actor {
  constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
    if (pos instanceof Vector && size instanceof Vector && speed instanceof Vector) {
      this.pos = pos;
      this.size = size;
      this.speed = speed;
    } else if (!(pos instanceof Vector)) {
      throw new SyntaxError(`${pos} не является объектом класса Vector`);
    } else if (!(size instanceof Vector)) {
      throw new SyntaxError(`${size} не является объектом класса Vector`);
    } else if (!(speed instanceof Vector)) {
      throw new SyntaxError(`${speed} не является объектом класса Vector`);
    }
	}
	get type() {
		return 'actor';
	}
	get left() {
		return this.pos.x;
	}
	get right() {
		return this.pos.x + this.size.x;
	}
	get top() {
		return this.pos.y;
	}
	get bottom() {
		return this.pos.y + this.size.y;
	}

  act() {
  }

  isIntersect(otherActor) {
    if (!(otherActor instanceof Actor)) {
      throw new Error(`В метод isIntersect не передан объект типа Actor`);
    }
    if (this === otherActor) { // если равен самому себе
      return false;
    }   
  
  return this.right > otherActor.left && 
           this.left < otherActor.right && 
           this.top < otherActor.bottom && 
           this.bottom > otherActor.top;
  }
}

class Level {
  constructor(grid = [], actors = []) { 
    this.actors = actors.slice();
    this.grid = grid.slice();  
    this.height = this.grid.length; 
    this.width = this.height === 0 ? 0 : Math.max(...grid.map(elem => elem.length));
    this.status = null; 
    this.finishDelay = 1; 
    this.player = this.actors.find(actor => actor.type === 'player');
  }

  isFinished() {
    return this.status !== null && this.finishDelay < 0;
  }

  actorAt(actor) { 
    if (!(actor instanceof Actor)) {
      throw new SyntaxError(`${actor} не является объектом Actor`); 
    }
    return this.actors.find(elem => elem.isIntersect(actor));
  }

  obstacleAt(target, size) {
    if (!(target instanceof Vector)) {
      throw new SyntaxError(`${target} не является объектом Vector`);
    } else if (!(size instanceof Vector)) {
      throw new SyntaxError(`${size} не является объектом Vector`);
    } else {
      const movingActor = new Actor(target, size);
      if (movingActor.top < 0 || movingActor.left < 0 || movingActor.right > this.width) {
        return `wall`;
      }
      if (movingActor.bottom > this.height) {
        return `lava`;
      }
      for (let i = Math.floor(movingActor.left); i < Math.ceil(movingActor.right); i++) {
        for (let j = Math.floor(movingActor.top); j < Math.ceil(movingActor.bottom); j++) {
          if (this.grid [j][i] !== undefined) {
            return this.grid[j][i];
          }
        }
      }
    return undefined;
    }
  }

  removeActor(actor) { 
    const actorIndex = this.actors.indexOf(actor); 
    if (actorIndex !== -1) {
      this.actors.splice(actorIndex, 1); 
    }
  }

  noMoreActors(type) { 
    return !this.actors.some((actor) => actor.type === type)
  }

  playerTouched(touchedType, actor) {
    if (this.status !== null) {
      return;
    }
    if (['lava', 'fireball'].some((el) => el === touchedType)) { 
      return this.status = 'lost'; 
    } 
    if (touchedType === 'coin' && actor.type === 'coin') { 
      this.removeActor(actor); 
      if (this.noMoreActors('coin')) { 
        return this.status = 'won' 
      }
    }
  }
}

class LevelParser {
  constructor(letterDictionary = {}) { 
    this.letterDictionary = Object.assign({}, letterDictionary);
  }

  actorFromSymbol(letter) {
    return this.letterDictionary[letter];
  }

  obstacleFromSymbol(letter) { 
    if (letter === 'x') {
      return 'wall'
    }
    if (letter === '!') {
      return 'lava'
    }
  }

  createGrid(plan) {
    return plan.map(line => line.split('')).map(line => line.map(line => this.obstacleFromSymbol(line)));  
  }

  createActors(plan) { 
    return plan.reduce((rez, itemY, y) => {
      itemY.split('').forEach((itemX, x) => {
        const constructor = this.actorFromSymbol(itemX);
        if (typeof constructor === 'function') {
          const actor = new constructor(new Vector(x, y));
          if (actor instanceof Actor) {
            rez.push(actor);
          }
        }
      });
      return rez;
    },[]);
  }

  parse(plan) {
    return new Level(this.createGrid(plan), this.createActors(plan));
  }
}

class Fireball extends Actor {
  constructor(pos = new Vector(0, 0), speed = new Vector(1, 1)) {
     super(pos, new Vector(1, 1), speed);
  }

  get type() {
    return 'fireball';
  }

  getNextPosition(time = 1) {
    return this.pos.plus(this.speed.times(time));
  }

  handleObstacle() {
    this.speed = this.speed.times(-1);
  }

  act(time, level) {
    const nextPosition = this.getNextPosition(time);
    if (level.obstacleAt(nextPosition, this.size)) {
      this.handleObstacle();
    } else {
      this.pos = nextPosition;
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(2, 0));
  }
}

class VerticalFireball extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(0, 2));
  }
}

class FireRain extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(0, 3));
    this.startPos = this.pos;
  }

  handleObstacle() {
    this.pos = this.startPos;
  }
}

class Coin extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
    this.spring = Math.random() * (Math.PI * 2);
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.startPos = this.pos;
  }

  get type() {
    return 'coin';
  }

  updateSpring(time = 1) {
    this.spring += this.springSpeed * time;
  }

  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist)
  }

  getNextPosition(time = 0) {
    this.updateSpring(time);
    return this.startPos.plus(this.getSpringVector());
  }

  act(time = 1) {
    this.pos = this.getNextPosition(time);
  }
}

class Player extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5));
  }

  get type() {
    return 'player';
  }
}

const schemas = [

  [
    "     v                 ",
    "                       ",
    "                       ",
    "                       ",
    "                       ",
    "  |xxx       w         ",
    "  o                 o  ",
    "  x               = x  ",
    "  x          o o    x  ",
    "  x  @    *  xxxxx  x  ",
    "  xxxxx             x  ",
    "      x!!!!!!!!!!!!!x  ",
    "      xxxxxxxxxxxxxxx  ",
    "                       "
  ],
  [
    "     v                 ",
    "                       ",
    "                       ",
    "                       ",
    "                       ",
    "  |                    ",
    "  o                 o  ",
    "  x               = x  ",
    "  x          o o    x  ",
    "  x  @       xxxxx  x  ",
    "  xxxxx             x  ",
    "      x!!!!!!!!!!!!!x  ",
    "      xxxxxxxxxxxxxxx  ",
    "                       "
  ],
  [
    "        |           |  ",
    "                       ",
    "                       ",
    "                       ",
    "                       ",
    "                       ",
    "                       ",
    "                       ",
    "                       ",
    "     |                 ",
    "                       ",
    "         =      |      ",
    " @ |  o            o   ",
    "xxxxxxxxx!!!!!!!xxxxxxx",
    "                       "
  ],
  [
    "                       ",
    "                       ",
    "                       ",
    "    o                  ",
    "    x      | x!!x=     ",
    "         x             ",
    "                      x",
    "                       ",
    "                       ",
    "                       ",
    "               xxx     ",
    "                       ",
    "                       ",
    "       xxx  |          ",
    "                       ",
    " @                     ",
    "xxx                    ",
    "                       "
  ], [
    "   v         v",
    "              ",
    "         !o!  ",
    "              ",
    "              ",
    "              ",
    "              ",
    "         xxx  ",
    "          o   ",
    "        =     ",
    "  @           ",
    "  xxxx        ",
    "  |           ",
    "      xxx    x",
    "              ",
    "          !   ",
    "              ",
    "              ",
    " o       x    ",
    " x      x     ",
    "       x      ",
    "      x       ",
    "   xx         ",
    "              "
  ]

];

const actorDict = {
    '@': Player,
    'v': FireRain,
    'o': Coin,
    '=': HorizontalFireball,
    '|': VerticalFireball
};

const parser = new LevelParser(actorDict);

runGame(schemas, parser, DOMDisplay)
  .then(() => console.log('Вы выиграли приз!'));
