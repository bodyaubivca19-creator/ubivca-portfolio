UBIVCA Digital Portfolio — версия с настоящей админкой Supabase

Что уже изменено:
1. IndexedDB заменен на Supabase Database.
2. Файлы загружаются в Supabase Storage bucket: portfolio-files.
3. Вход в админку идет через Supabase Auth.
4. Пароль больше не хранится в JavaScript-файлах сайта.

Перед запуском:
1. В Supabase SQL Editor выполните файл SUPABASE_NEXT_SQL.sql.
2. Убедитесь, что в Authentication создан админ: bodyaubivca19@gmail.com.
3. Проверьте js/supabase-config.js. Там должен быть правильный Project URL.
4. Откройте admin.html и войдите email + пароль от Supabase Auth.

Важно:
- Secret key нигде не вставлять.
- В GitHub можно публиковать только publishable/anon key.
- Bucket portfolio-files должен быть Public.
