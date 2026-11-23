import { Room } from "./room.js";
import { WindowObject } from "./window.js";
import { Bird } from "./bird.js";
import { Bookcase } from "./bookcase.js";
import { Desk } from "./desk.js";
import { Clock } from "./clock.js";
import { Hourglass } from "./hourglass.js";
import { Plant } from "./plant.js";
import { Calendar } from "./calendar.js";
import { Trophy } from "./trophy.js";
import { Mascot } from "./mascot.js";
import { Bookshelf } from "./bookshelf.js";
import { PhotoFrame } from "./photo-frame.js";
import { Pinboard } from "./pinboard.js";
import { Drawer } from "./drawer.js";
import { Computer } from "./computer.js";
import { Phone } from "./phone.js";
import { Notebook } from "./notebook.js";
import { Headphones } from "./headphones.js";
import { Lamp } from "./lamp.js";
import { CoffeeMug } from "./coffee.js";

export const objectTypes = [
  Room,
  WindowObject,
  Bird,
  Bookcase,
  Desk,
  Clock,
  Hourglass,
  Plant,
  Calendar,
  Trophy,
  Mascot,
  Bookshelf,
  PhotoFrame,
  Pinboard,
  Drawer,
  Computer,
  Phone,
  Notebook,
  Headphones,
  Lamp,
  CoffeeMug
];

export function createRoomObjects() {
  return objectTypes.flatMap((ObjectType) =>
    Array.from(document.querySelectorAll(ObjectType.selector), (element) => new ObjectType(element))
  );
}
