import { subscribe, channel } from "../engine/store";

export function onQuizEvent(handler) {
  return subscribe(handler);
}

export function quizRoomName(quizId) {
  return `quiz:${quizId}`;
}

export { channel };
