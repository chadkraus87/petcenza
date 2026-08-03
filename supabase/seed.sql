-- Dev seed. Run AFTER creating a dev user via Supabase Auth, then substitute the UUID below,
-- or run scripts/seed.md instructions which do this automatically with the service key.
-- Replace :dev_user with your dev auth.users id.
\set dev_user '00000000-0000-0000-0000-000000000001'

insert into public.pets (id, user_id, name, nickname, species, breed, is_mixed_breed, sex, birth_date, adoption_date, color, goal_weight_kg, activity_level, microchip_no, favorite_foods, favorite_toys, favorite_activities)
values
  ('11111111-1111-1111-1111-111111111111', :'dev_user', 'Ranger', 'Big R', 'dog', 'German Shepherd mix', true, 'male_neutered', '2020-03-14', '2020-06-01', 'Black & tan', 36.0, 'high', '985112004567890', array['salmon kibble','pumpkin'], array['rope tug','frisbee'], array['trail hikes','fetch']),
  ('22222222-2222-2222-2222-222222222222', :'dev_user', 'Mochi', null, 'cat', 'Domestic Shorthair', false, 'female_spayed', '2022-08-02', '2022-11-10', 'Calico', 4.2, 'moderate', '985112009876543', array['tuna pate'], array['feather wand'], array['window birdwatching']);

insert into public.veterinarians (id, user_id, name, clinic, address, phone, is_primary, is_emergency_clinic) values
  ('33333333-3333-3333-3333-333333333333', :'dev_user', 'Dr. Elena Vasquez', 'Plum Creek Animal Hospital', '123 FM 150, Kyle, TX', '512-555-0142', true, false),
  ('44444444-4444-4444-4444-444444444444', :'dev_user', 'Emergency Staff', 'Austin Vet Emergency & Specialty', '7300 Ranch Rd 2222, Austin, TX', '512-555-0199', false, true);

insert into public.emergency_contacts (user_id, label, name, phone, sort_order) values
  (:'dev_user','Animal Poison Control','ASPCA Poison Control','888-426-4435',0),
  (:'dev_user','Pet sitter','Jamie R.','512-555-0170',1);

insert into public.weight_entries (user_id, pet_id, measured_on, weight_kg, body_condition)
select :'dev_user', '11111111-1111-1111-1111-111111111111', d::date, 33.5 + (random()*2.5), 5
from generate_series(current_date - interval '10 months', current_date, interval '1 month') d;

insert into public.medications (user_id, pet_id, name, dosage, frequency, starts_on, ends_on, instructions, prescriber_id, refill_due_on) values
  (:'dev_user','11111111-1111-1111-1111-111111111111','Carprofen','75 mg','Twice daily with food', current_date - 10, current_date + 20, 'Give with a full meal; watch for GI upset.', '33333333-3333-3333-3333-333333333333', current_date + 14),
  (:'dev_user','22222222-2222-2222-2222-222222222222','Revolution Plus','1 tube topical','Monthly', current_date - 60, null, 'Apply to back of neck.', '33333333-3333-3333-3333-333333333333', current_date + 5);

insert into public.allergies (user_id, pet_id, allergy_type, allergen, severity, symptoms, emergency_treatment) values
  (:'dev_user','11111111-1111-1111-1111-111111111111','food','Chicken','moderate','Itchy skin, ear infections','Antihistamine per vet guidance'),
  (:'dev_user','11111111-1111-1111-1111-111111111111','medication','Penicillin','severe','Facial swelling, hives','Seek emergency care immediately');

insert into public.vaccinations (user_id, pet_id, vaccine, administered_on, next_due_on, veterinarian_id) values
  (:'dev_user','11111111-1111-1111-1111-111111111111','Rabies (3-yr)','2024-04-02','2027-04-02','33333333-3333-3333-3333-333333333333'),
  (:'dev_user','11111111-1111-1111-1111-111111111111','DHPP', current_date - interval '11 months', current_date + interval '1 month','33333333-3333-3333-3333-333333333333'),
  (:'dev_user','22222222-2222-2222-2222-222222222222','FVRCP', current_date - interval '1 year', current_date + interval '2 weeks','33333333-3333-3333-3333-333333333333');

insert into public.vet_visits (user_id, pet_id, veterinarian_id, visit_at, reason, diagnosis, treatment) values
  (:'dev_user','11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333', now() + interval '9 days', 'Annual wellness + DHPP booster', null, null),
  (:'dev_user','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333', now() - interval '3 months', 'Dental cleaning', 'Grade 1 tartar', 'Prophylactic cleaning under anesthesia');

insert into public.medical_records (user_id, pet_id, record_type, title, occurred_on, veterinarian_id, details) values
  (:'dev_user','11111111-1111-1111-1111-111111111111','bloodwork','Annual CBC + chemistry', current_date - 30, '33333333-3333-3333-3333-333333333333','All values within normal range.'),
  (:'dev_user','11111111-1111-1111-1111-111111111111','condition','Mild hip dysplasia (right)', '2024-09-15', '33333333-3333-3333-3333-333333333333','Managed with weight control and joint supplement.');

insert into public.nutrition_plans (user_id, pet_id, food_brand, formula, portion, calories_per_day, supplements, foods_to_avoid) values
  (:'dev_user','11111111-1111-1111-1111-111111111111','Purina Pro Plan','Sensitive Skin & Stomach Salmon','2.5 cups/day split AM/PM', 1450, 'Cosequin DS daily', 'Chicken, grapes, onions, xylitol');

insert into public.feeding_schedules (user_id, pet_id, label, feed_time, portion) values
  (:'dev_user','11111111-1111-1111-1111-111111111111','Breakfast','07:00','1.25 cups'),
  (:'dev_user','11111111-1111-1111-1111-111111111111','Dinner','18:00','1.25 cups'),
  (:'dev_user','22222222-2222-2222-2222-222222222222','Breakfast','07:00','1/2 can'),
  (:'dev_user','22222222-2222-2222-2222-222222222222','Dinner','18:30','1/2 can');

insert into public.reminders (user_id, pet_id, kind, title, due_at, recurrence) values
  (:'dev_user','11111111-1111-1111-1111-111111111111','medication','Carprofen — evening dose', date_trunc('day', now()) + interval '18 hours', 'daily'),
  (:'dev_user','11111111-1111-1111-1111-111111111111','grooming','Nail trim', now() + interval '4 days', 'monthly'),
  (:'dev_user','22222222-2222-2222-2222-222222222222','vaccination','FVRCP booster due', now() + interval '14 days', 'none');

insert into public.grooming_logs (user_id, pet_id, task, done_on) values
  (:'dev_user','11111111-1111-1111-1111-111111111111','Bath', current_date - 12),
  (:'dev_user','11111111-1111-1111-1111-111111111111','Nail trim', current_date - 26);

insert into public.behavior_notes (user_id, pet_id, category, content) values
  (:'dev_user','11111111-1111-1111-1111-111111111111','anxiety_trigger','Thunderstorms — settles with white noise + crate.'),
  (:'dev_user','11111111-1111-1111-1111-111111111111','command','Solid: sit, stay, place, heel. In progress: distance recall.');
