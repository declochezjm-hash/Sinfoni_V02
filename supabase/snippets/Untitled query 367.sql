// 1. Test lecture des contacts
const { data: contacts, error: errContacts } = await supabase
  .from('contacts')
  .select('id, first_name, last_name')
  .limit(5);

console.log('Contacts:', contacts, 'Error:', errContacts);

// 2. Test Marie Lefranc
const { data: user, error: errUser } = await supabase
  .from('users')
  .select('id, email, organization_id')
  .eq('email', 'm.lefranc@syndicat.fr')
  .maybeSingle();

console.log('Marie Lefranc:', user, 'Error:', errUser);