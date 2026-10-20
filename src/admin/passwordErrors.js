/** The shortest password the server accepts (server/auth.js). */
export const MIN_PASSWORD_LENGTH = 8;

// The server answers in English (server/auth.js, the login rate limit in
// server/index.js); the admin is in Russian. Anything not listed is shown as is.
// passwordErrors.test.js checks each of these is still what the server says.
export const SERVER_ERRORS = {
  'Incorrect password': 'Неверный пароль',
  'Incorrect current password': 'Текущий пароль введён неверно',
  'New password must be at least 8 characters': `Новый пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`,
  'Too many login attempts, try again in a minute':
    'Слишком много попыток. Подождите минуту и попробуйте снова.',
};

/** A login or password-change error from the server, as the admin shows it. */
export function passwordErrorText(message, fallback) {
  return SERVER_ERRORS[message] ?? (message || fallback);
}
