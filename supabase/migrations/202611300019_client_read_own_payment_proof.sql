begin;

-- Klien hanya bisa membaca bukti di folder miliknya sendiri. Bukti yang
-- diunggah Admin atau Marketing untuk pembayaran klien tersimpan di folder
-- lain, jadi tidak bisa dibuka.
--
-- Cocoknya payments.proof_path saja tidak cukup: path itu dikirim dari
-- aplikasi saat klien membayar. Karena itu folder berkas juga harus sesuai
-- dengan transaksi atau SPK dari pembayaran tersebut.

drop policy if exists "Client read proof of own payment" on storage.objects;
create policy "Client read proof of own payment"
on storage.objects for select to authenticated
using (
  bucket_id in ('payment-proofs', 'spk-client-private-documents')
  and exists (
    select 1
    from public.payments p
    join public.customers c on c.id = p.customer_id
    where c.user_id = auth.uid()
      and p.proof_path = objects.name
      and (
        (
          objects.bucket_id = 'payment-proofs'
          and (
            -- Unggahan Admin: {transaksi}/..., transaction/{transaksi}/...
            (storage.foldername(objects.name))[1] = p.transaction_id::text
            or (
              (storage.foldername(objects.name))[1] = 'transaction'
              and (storage.foldername(objects.name))[2] = p.transaction_id::text
            )
            -- spk/{spk}/..., atau spk/{pembayaran}/... saat unggah ulang
            or (
              (storage.foldername(objects.name))[1] = 'spk'
              and (storage.foldername(objects.name))[2] in (p.spk_request_id::text, p.id::text)
            )
          )
        )
        or (
          -- Bukti tanda jadi SPK Marketing: {uid marketing}/{spk}/...
          objects.bucket_id = 'spk-client-private-documents'
          and (storage.foldername(objects.name))[2] = p.spk_request_id::text
        )
      )
  )
);

commit;
