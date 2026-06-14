const url = 'https://bgijvwneyxrgrugxeyor.supabase.co/storage/v1/object/public/product-images/test.jpg';
fetch(url).then(res => console.log(res.status)).catch(console.error);
