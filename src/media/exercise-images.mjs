export const EXERCISE_IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

export function firstExerciseImage(exercise = {}) {
  const image = exercise.images?.[0];
  if (image) return image.startsWith("http") ? image : `${EXERCISE_IMAGE_BASE}${encodeURI(image)}`;
  if (exercise.exercise_id) return `${EXERCISE_IMAGE_BASE}${encodeURIComponent(exercise.exercise_id)}/0.jpg`;
  return null;
}
