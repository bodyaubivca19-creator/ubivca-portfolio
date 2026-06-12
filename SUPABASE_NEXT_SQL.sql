-- Выполнить в Supabase SQL Editor перед загрузкой обновленного сайта.
-- Этот столбец нужен, чтобы админка сохраняла дополнительные поля проекта:
-- теги, подробное описание, ссылки на демо/репозиторий/видео, признаки featured/new.

alter table public.works
add column if not exists meta jsonb not null default '{}'::jsonb;

-- На всякий случай: разрешаем public читать только опубликованные работы.
-- Если такая policy уже создана, повторно ее запускать не надо.
-- create policy "Public can read published works"
-- on public.works
-- for select
-- using (is_published = true);
