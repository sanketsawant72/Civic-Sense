export const DUPLICATE_RADIUS_METERS = 100;
export const DUPLICATE_SIMILARITY_THRESHOLD = 0.45;

const STOP_WORDS = new Set([
  'about', 'after', 'again', 'also', 'are', 'been', 'before', 'being',
  'could', 'from', 'have', 'into', 'near', 'over', 'that', 'their',
  'there', 'these', 'they', 'this', 'through', 'under', 'very', 'were',
  'what', 'when', 'where', 'which', 'will', 'with', 'would', 'your',
]);

function tokenize(text) {
  return new Set(
    text
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
  );
}

function diceSimilarity(left, right) {
  if (left.size === 0 || right.size === 0) return 0;
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) overlap++;
  }
  return (2 * overlap) / (left.size + right.size);
}

export function textSimilarity(complaint, candidate) {
  const titleSimilarity = diceSimilarity(
    tokenize(complaint.title),
    tokenize(candidate.title)
  );
  const descriptionSimilarity = diceSimilarity(
    tokenize(complaint.description),
    tokenize(candidate.description)
  );
  return (titleSimilarity * 0.6) + (descriptionSimilarity * 0.4);
}

export function distanceInMeters(lat1, lng1, lat2, lng2) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const latitudeDelta = radians(lat2 - lat1);
  const longitudeDelta = radians(lng2 - lng1);
  const a =
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2))
    * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isValidLocation(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= -90 && lat <= 90
    && lng >= -180 && lng <= 180;
}
