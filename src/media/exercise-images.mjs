export const EXERCISE_IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

function exerciseImageUrl(image) {
  if (!image || typeof image !== "string") return null;
  return image.startsWith("http") ? image : `${EXERCISE_IMAGE_BASE}${encodeURI(image)}`;
}

export function exerciseImageUrls(exercise = {}, { limit = 4 } = {}) {
  const images = Array.isArray(exercise.images) ? exercise.images : [];
  return [...new Set(images.map(exerciseImageUrl).filter(Boolean))].slice(0, limit);
}

export function firstExerciseImage(exercise = {}) {
  const [image] = exerciseImageUrls(exercise, { limit: 1 });
  if (image) return image;
  if (exercise.exercise_id) return `${EXERCISE_IMAGE_BASE}${encodeURIComponent(exercise.exercise_id)}/0.jpg`;
  return null;
}
