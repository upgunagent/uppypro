-- Create a new private bucket for chat media
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

-- Policy: Allow Authenticated Users to Upload
create policy "Authenticated Users Can Upload Media"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'chat-media' );

-- Policy: Allow Public to View Media (so Meta/Receiver can download)
create policy "Public Can View Media"
on storage.objects for select
to public
using ( bucket_id = 'chat-media' );
