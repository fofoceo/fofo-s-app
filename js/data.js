/* Content library — meals, letters, rotations and goal templates */

const MEALS = {
  breakfast: [
    { name: 'Berry Vanilla Overnight Oats', time: '5 min + overnight', note: 'Fibre-rich, make-ahead',
      ingredients: ['½ cup rolled oats', '½ cup milk of choice', '¼ cup Greek yogurt', '1 tbsp chia seeds', '½ tsp vanilla', '1 tsp honey', 'Handful of mixed berries'],
      steps: ['Stir oats, milk, yogurt, chia, vanilla and honey in a jar.', 'Cover and refrigerate overnight.', 'Top with berries in the morning and enjoy cold.'] },
    { name: 'Avocado Toast with a Soft Egg', time: '12 min', note: 'Healthy fats + protein',
      ingredients: ['1 slice sourdough', '½ ripe avocado', '1 egg', 'Lemon juice', 'Chilli flakes, salt & pepper'],
      steps: ['Boil the egg for 6½ minutes, then cool in cold water and peel.', 'Toast the bread and mash avocado with lemon, salt and pepper.', 'Spread on toast, halve the egg on top and finish with chilli flakes.'] },
    { name: 'Pomegranate Yogurt Parfait', time: '5 min', note: 'Light & antioxidant-rich',
      ingredients: ['¾ cup Greek yogurt', '¼ cup granola', '2 tbsp pomegranate seeds', '1 tsp honey', 'Pinch of cinnamon'],
      steps: ['Layer half the yogurt in a glass, then half the granola.', 'Repeat the layers.', 'Finish with pomegranate, honey and cinnamon.'] },
    { name: 'Strawberry Banana Smoothie Bowl', time: '7 min', note: 'Vitamin C glow',
      ingredients: ['1 frozen banana', '1 cup frozen strawberries', '¼ cup milk', '1 tbsp almond butter', 'Toppings: coconut, granola, sliced fruit'],
      steps: ['Blend banana, strawberries, milk and almond butter until thick.', 'Pour into a bowl.', 'Arrange your toppings in pretty rows.'] },
    { name: 'Spinach & Feta Omelette', time: '10 min', note: 'High-protein focus fuel',
      ingredients: ['2 eggs', 'Handful of baby spinach', '2 tbsp crumbled feta', '1 tsp olive oil', 'Salt & pepper'],
      steps: ['Whisk eggs with salt and pepper.', 'Wilt spinach in oil, then pour in the eggs.', 'Cook gently, add feta, fold and serve.'] },
    { name: 'Cinnamon Banana Oat Pancakes', time: '15 min', note: 'Naturally sweet',
      ingredients: ['1 ripe banana', '2 eggs', '⅓ cup oats', '½ tsp cinnamon', 'Butter for the pan', 'Maple syrup & berries'],
      steps: ['Blend banana, eggs, oats and cinnamon into a batter.', 'Cook small rounds in a buttered pan, 2 min per side.', 'Stack and top with berries and a drizzle of maple.'] },
    { name: 'Labneh, Cucumber & Za’atar Toast', time: '6 min', note: 'Fresh & savoury',
      ingredients: ['1 slice seeded bread', '3 tbsp labneh', '¼ cucumber, sliced', '1 tsp za’atar', 'Olive oil', 'Mint leaves'],
      steps: ['Toast the bread.', 'Spread thickly with labneh and layer cucumber.', 'Finish with za’atar, olive oil and mint.'] },
  ],
  lunch: [
    { name: 'Mediterranean Chickpea Salad', time: '10 min', note: 'Plant protein, meal-prep friendly',
      ingredients: ['1 can chickpeas, drained', '1 cup cherry tomatoes', '½ cucumber', '¼ red onion', 'Feta & olives', 'Olive oil, lemon, oregano'],
      steps: ['Chop the vegetables.', 'Toss everything with olive oil, lemon, oregano, salt and pepper.', 'Keeps beautifully in the fridge for 3 days.'] },
    { name: 'Chicken Pesto Wrap', time: '8 min', note: 'Easy to pack for school',
      ingredients: ['1 large tortilla', '1 cooked chicken breast, sliced', '1 tbsp pesto', 'Rocket', 'Sun-dried tomatoes', 'Mozzarella'],
      steps: ['Spread pesto over the tortilla.', 'Layer chicken, rocket, tomatoes and mozzarella.', 'Roll tightly, cut in half and wrap in paper.'] },
    { name: 'Teriyaki Salmon Rice Bowl', time: '20 min', note: 'Omega-3 for the brain',
      ingredients: ['1 salmon fillet', '2 tbsp teriyaki sauce', '1 cup cooked rice', '½ avocado', 'Edamame & cucumber', 'Sesame seeds'],
      steps: ['Brush salmon with teriyaki and bake at 200°C for 12 minutes.', 'Fill a bowl with rice, avocado, edamame and cucumber.', 'Flake salmon on top and sprinkle with sesame.'] },
    { name: 'Halloumi & Roasted Veg Couscous', time: '25 min', note: 'Golden & comforting',
      ingredients: ['½ cup couscous', '1 courgette, 1 pepper, ½ red onion', '80g halloumi', 'Olive oil', 'Lemon & parsley'],
      steps: ['Roast chopped vegetables with oil at 200°C for 20 minutes.', 'Pour boiling water over couscous, cover for 5 minutes, fluff.', 'Fry halloumi slices until golden; combine with lemon and parsley.'] },
    { name: 'Tomato Basil Pasta Salad', time: '15 min', note: 'Light lunchbox staple',
      ingredients: ['1 cup pasta', 'Cherry tomatoes', 'Mini mozzarella balls', 'Fresh basil', 'Balsamic glaze', 'Olive oil'],
      steps: ['Cook pasta, rinse under cold water.', 'Halve tomatoes and mozzarella; tear the basil.', 'Toss with oil, salt and a ribbon of balsamic.'] },
    { name: 'Turkey & Hummus Pita Pocket', time: '5 min', note: 'Protein-packed & quick',
      ingredients: ['1 wholemeal pita', '2 tbsp hummus', 'Sliced turkey', 'Spinach & grated carrot', 'Cucumber'],
      steps: ['Warm and open the pita.', 'Spread hummus inside.', 'Fill with turkey and vegetables.'] },
    { name: 'Lemony Red Lentil Soup', time: '30 min', note: 'Warming, iron-rich',
      ingredients: ['¾ cup red lentils', '1 onion, 1 carrot', '1 tsp cumin', '4 cups stock', 'Juice of ½ lemon', 'Olive oil'],
      steps: ['Soften onion and carrot in oil with cumin.', 'Add lentils and stock; simmer 20 minutes.', 'Blend until silky, then stir in lemon and season.'] },
  ],
  snack: [
    { name: 'Apple Slices & Almond Butter', time: '3 min', note: 'Steady energy',
      ingredients: ['1 crisp apple', '1 tbsp almond butter', 'Pinch of cinnamon'],
      steps: ['Slice the apple.', 'Dip into almond butter dusted with cinnamon.'] },
    { name: 'Dark Chocolate Strawberries', time: '10 min', note: 'A little luxury',
      ingredients: ['8 strawberries', '30g dark chocolate (70%)', 'Flaky sea salt'],
      steps: ['Melt chocolate gently.', 'Dip strawberries halfway and place on baking paper.', 'Sprinkle with salt and chill 5 minutes.'] },
    { name: 'Hummus & Rainbow Crudités', time: '5 min', note: 'Crunchy & fresh',
      ingredients: ['3 tbsp hummus', 'Carrot, cucumber, pepper sticks', 'Paprika & olive oil'],
      steps: ['Cut vegetables into sticks.', 'Swirl hummus with oil and paprika and dip.'] },
    { name: 'Peanut Butter Stuffed Dates', time: '4 min', note: 'Pre-study fuel',
      ingredients: ['4 Medjool dates', '1 tbsp peanut butter', 'Crushed pistachios'],
      steps: ['Pit the dates.', 'Fill with peanut butter and press on pistachios.'] },
    { name: 'Cottage Cheese Rice Cakes', time: '3 min', note: 'Light protein',
      ingredients: ['2 rice cakes', '3 tbsp cottage cheese', 'Honey', 'Sliced strawberries'],
      steps: ['Spread cottage cheese over the rice cakes.', 'Top with strawberries and a drizzle of honey.'] },
    { name: 'Golden Trail Mix', time: '2 min', note: 'Desk-drawer favourite',
      ingredients: ['Almonds & cashews', 'Dried apricots', 'Dark chocolate chips', 'Pumpkin seeds'],
      steps: ['Mix a small handful of each.', 'Portion into a jar for the week.'] },
    { name: 'Berry Frozen Yogurt Bark', time: '5 min + freeze', note: 'Cool & sweet',
      ingredients: ['1 cup Greek yogurt', '1 tbsp honey', 'Mixed berries', 'Granola'],
      steps: ['Spread sweetened yogurt on a lined tray.', 'Scatter berries and granola.', 'Freeze 2 hours, then snap into pieces.'] },
  ],
  dinner: [
    { name: 'Honey Garlic Salmon & Greens', time: '20 min', note: 'Glow-from-within dinner',
      ingredients: ['1 salmon fillet', '1 tbsp honey', '1 garlic clove', '1 tbsp soy sauce', 'Green beans or broccoli', 'Rice or quinoa'],
      steps: ['Mix honey, grated garlic and soy; brush on the salmon.', 'Bake at 200°C for 12–14 minutes with greens on the tray.', 'Serve over rice or quinoa.'] },
    { name: 'Creamy Tuscan Chicken', time: '25 min', note: 'Cosy & satisfying',
      ingredients: ['1 chicken breast', '½ cup cream or coconut milk', 'Sun-dried tomatoes', 'Spinach', 'Garlic & Italian herbs', 'Parmesan'],
      steps: ['Season and pan-fry chicken until cooked; set aside.', 'Sauté garlic and tomatoes, add cream, herbs and parmesan.', 'Wilt spinach, return chicken and spoon sauce over.'] },
    { name: 'Rainbow Veggie Stir-fry', time: '15 min', note: 'Colourful & quick',
      ingredients: ['Tofu or chicken strips', 'Peppers, broccoli, carrot, snap peas', '2 tbsp soy sauce', '1 tsp ginger', '1 tsp sesame oil', 'Noodles or rice'],
      steps: ['Sear protein in a hot pan; set aside.', 'Stir-fry vegetables 4 minutes with ginger.', 'Return protein, add soy and sesame oil, serve over noodles.'] },
    { name: 'Shakshuka for One', time: '20 min', note: 'Rich, warming, one pan',
      ingredients: ['1 can chopped tomatoes', '½ onion, ½ pepper', '1 tsp cumin & paprika', '2 eggs', 'Feta & parsley', 'Crusty bread'],
      steps: ['Soften onion and pepper with spices.', 'Add tomatoes and simmer 8 minutes.', 'Make wells, crack in eggs, cover until just set; top with feta.'] },
    { name: 'Turkey Meatballs in Marinara', time: '30 min', note: 'Batch-cook for the week',
      ingredients: ['250g turkey mince', '2 tbsp breadcrumbs', '1 egg', 'Garlic & basil', '1 jar marinara', 'Pasta or zucchini noodles'],
      steps: ['Mix mince, crumbs, egg, garlic and roll into balls.', 'Brown in a pan, then simmer in marinara 15 minutes.', 'Serve over pasta with fresh basil.'] },
    { name: 'Lemon Herb Chicken & Potatoes', time: '40 min', note: 'Sunday-style comfort',
      ingredients: ['2 chicken thighs', 'Baby potatoes, halved', '1 lemon', 'Rosemary & thyme', 'Garlic', 'Olive oil'],
      steps: ['Toss everything with oil, lemon juice, herbs and garlic.', 'Roast at 210°C for 35 minutes, turning once.', 'Finish with lemon zest.'] },
    { name: 'Creamy Tomato Spinach Gnocchi', time: '15 min', note: 'Ten-ingredient luxury',
      ingredients: ['250g gnocchi', '½ cup passata', '2 tbsp cream cheese', 'Spinach', 'Garlic', 'Parmesan & chilli'],
      steps: ['Pan-fry gnocchi until golden.', 'Add garlic, passata and cream cheese; stir until silky.', 'Fold through spinach and finish with parmesan.'] },
  ],
};

const LETTERS = [
  'You don’t have to do everything today. You only have to do the next small thing with your whole heart. The rest will arrange itself around your steadiness.',
  'Every page you study is a quiet promise to the woman you are becoming. She is grateful — and she is already proud of you.',
  'Soft does not mean slow. You can be gentle with yourself and still move mountains, one focused hour at a time.',
  'Your room, your skin, your mind — tend to them like a garden. A little care, every single day, becomes something breathtaking.',
  'Consistency is the most elegant thing you can wear. Put it on this morning and notice how differently the day fits.',
  'Rest is not a reward you earn. It is part of the plan. Protect your evening ritual like it is an appointment with someone important — because it is.',
  'You have survived every hard day so far. Today is not the exception. Breathe, begin, and let it be easier than you expect.',
  'Discipline is just remembering what you want. Look at your vision for one minute today, and let it pull you forward.',
  'Small, beautiful, repeated. That is the whole secret. You don’t need a perfect day — you need a faithful one.',
  'The version of you who aces the exam, saves for the trip, and wakes with glowing skin is built in ordinary afternoons exactly like this one.',
  'Make your space calm and your goals clear. Clutter quiets down, and so does the noise in your head.',
  'Be proud of the progress no one can see yet. Roots grow in silence before anything blooms.',
  'Choose ease where you can and effort where it matters. That is not laziness — that is wisdom.',
  'Today, speak to yourself the way you would speak to your best friend. Kindly, honestly, and with complete belief.',
];

// Indexed by day of week (0 = Sunday)
const ROOM = [
  { area: 'Weekly reset', detail: 'Fresh bedsheets, empty bins, water plants, plan the week ahead' },
  { area: 'Desk & study corner', detail: 'Clear the surface, file loose papers, restock pens & sticky notes' },
  { area: 'Wardrobe', detail: 'Fold, hang, steam tomorrow’s outfit, pull 3 pieces to donate' },
  { area: 'Vanity & skincare shelf', detail: 'Wipe bottles, check expiry dates, line up AM / PM products' },
  { area: 'Bed & nightstand', detail: 'Clear the nightstand, fluff pillows, refresh with linen spray' },
  { area: 'Floors & dusting', detail: 'Vacuum, dust shelves & mirrors, open the windows' },
  { area: 'Drawers & declutter', detail: 'Empty one drawer completely and only return what you love' },
];

const WELLNESS = [
  { title: 'Slow Sunday — bath & hair mask', detail: 'Warm bath, deep-conditioning mask, candle, no screens' },
  { title: 'Pilates & stretch', detail: '30 min mat pilates, 15 min stretch, 15 min shower & body oil' },
  { title: 'Golden-hour walk', detail: 'Walk outside with a podcast or playlist, then a mindful tea' },
  { title: 'Face mask & journaling', detail: 'Sheet or clay mask while you journal three gratitudes' },
  { title: 'Yoga flow & breathwork', detail: 'Gentle 40 min flow, 10 min breathwork, 10 min stillness' },
  { title: 'Pamper hour — nails & hair', detail: 'Manicure, scalp massage, a slow skincare moment' },
  { title: 'Long walk & café reading', detail: 'Movement, sunshine and a chapter of something lovely' },
];

const SELFCARE = ['Cleanse', 'Serum', 'Moisturise', 'SPF', '2L water', 'Stretch', 'Evening skincare', 'Journal'];

const GOAL_CATEGORIES = ['Academic', 'Wellness', 'Finance', 'Personal growth', 'Career', 'Creative', 'Relationships', 'Home'];

const GOAL_TEMPLATES = {
  'Academic': ['List every topic that will come up', 'Make a two-week revision timetable', 'Complete one past paper under timed conditions', 'Ask a teacher about your weakest topic', 'Turn your mistakes into flashcards', 'Teach one topic out loud to an imaginary class'],
  'Wellness': ['Choose three non-negotiable daily habits', 'Prep a simple meal plan for the week', 'Sleep by 10:30pm for five nights', 'Track water for seven days', 'Schedule one full self-care evening', 'Swap one screen hour for a walk'],
  'Finance': ['Write down your exact target and deadline', 'Track every purchase for one week', 'Pick one spending category to reduce', 'Set a weekly amount to move into savings', 'Sell or swap three things you no longer use', 'Review your progress and celebrate'],
  'Personal growth': ['Write in one sentence why this matters', 'Read ten pages of a book about it', 'Find someone who has done it and learn from them', 'Do the smallest possible version today', 'Reflect on what worked this week'],
  'Career': ['Research three people in this field', 'Update your CV or portfolio', 'Learn one relevant skill for 20 minutes', 'Message one potential mentor', 'Apply to one opportunity'],
  'Creative': ['Create a mood board for the idea', 'Block a one-hour creative session', 'Finish one small piece, imperfectly', 'Share it with one trusted person', 'Plan the next, bigger piece'],
  'Relationships': ['Write down who you want to be closer to', 'Send a thoughtful message today', 'Plan one quality-time date', 'Practise listening without fixing', 'Write a note of appreciation'],
  'Home': ['Picture the finished space and note three words', 'Declutter one zone completely', 'Make a wish-list with prices', 'Do a 15-minute nightly reset for a week', 'Add one beautiful finishing touch'],
};

const REFLECTIONS = [
  'What made me feel most like myself this week?',
  'Which small habit is quietly changing my life?',
  'What am I avoiding — and what is the tiniest first step?',
  'Where did I spend energy that didn’t come back to me?',
  'What would make next week feel calm and successful?',
  'Which goal deserves more of my attention right now, and why?',
  'What am I proud of that nobody else noticed?',
  'How can I make studying feel softer and more inviting?',
];

const SAVING_TIPS = [
  'Try the 48-hour rule: add it to a wish-list and only buy if you still want it two days later.',
  'Pay yourself first — move your savings the moment money arrives, before you spend anything.',
  'Unsubscribe from shop newsletters. Fewer temptations, fuller savings.',
  'Name every savings goal beautifully. “Paris in Spring” is harder to raid than “Savings”.',
  'Plan one no-spend day each week and make it lovely — a walk, a library book, a home facial.',
  'Round up: every time you buy something, move the change to the nearest 5 into savings.',
  'Before buying skincare, finish what you have. Your shelf (and wallet) will thank you.',
];

const EXPENSE_CATS = ['Food & coffee', 'Beauty & skincare', 'Clothes', 'Transport', 'School', 'Going out', 'Gifts', 'Subscriptions', 'Other'];
const INCOME_CATS = ['Allowance', 'Job', 'Gift', 'Other'];
const EVENT_CATS = ['Social', 'School', 'Family', 'Wellness', 'Birthday', 'Personal', 'Travel'];
