import type { Track } from './types';

// Каждый трек привязан к жанру + настроению — генератор выбирает по ним
export const DEMO_TRACKS: Track[] = [
  // --- chill ---
  { id: 'd1', title: 'Sunset Boulevard', artist: 'Aerocity', album: 'Evening Vibes', duration: 195, coverUrl: '', genre: 'chill', mood: 'dreamy', spotifyId: '3t3i3o3o3o' },
  { id: 'd2', title: 'Ocean Drive', artist: 'Duke Dumont', album: 'Ocean Drive', duration: 212, coverUrl: '', genre: 'chill', mood: 'breezy', spotifyId: '4pA3o7B5C6' },
  { id: 'd3', title: 'Teardrop', artist: 'Massive Attack', album: 'Mezzanine', duration: 330, coverUrl: '', genre: 'chill', mood: 'serene' },
  { id: 'd4', title: 'Midnight City', artist: 'M83', album: 'Hurry Up', duration: 244, coverUrl: '', genre: 'chill', mood: 'dreamy' },
  { id: 'd5', title: 'Electric Feel', artist: 'MGMT', album: 'Oracular Spectacular', duration: 230, coverUrl: '', genre: 'chill', mood: 'energetic' },

  // --- jazz ---
  { id: 'j1', title: "Take Five", artist: 'Dave Brubeck', album: 'Time Out', duration: 324, coverUrl: '', genre: 'jazz', mood: 'cozy' },
  { id: 'j2', title: 'Feeling Good', artist: 'Nina Simone', album: 'I Put a Spell', duration: 178, coverUrl: '', genre: 'jazz', mood: 'warm' },
  { id: 'j3', title: "So What", artist: 'Miles Davis', album: 'Kind of Blue', duration: 562, coverUrl: '', genre: 'jazz', mood: 'chill' },
  { id: 'j4', title: "Fly Me to the Moon", artist: 'Frank Sinatra', album: 'It Might as Well Be Swing', duration: 150, coverUrl: '', genre: 'jazz', mood: 'cozy' },

  // --- indie folk ---
  { id: 'f1', title: 'Holocene', artist: 'Bon Iver', album: 'Bon Iver', duration: 337, coverUrl: '', genre: 'indie folk', mood: 'serene' },
  { id: 'f2', title: 'The Night We Met', artist: 'Lord Huron', album: 'Strange Trails', duration: 208, coverUrl: '', genre: 'indie folk', mood: 'serene' },
  { id: 'f3', title: 'Rivers and Roads', artist: 'The Head and the Heart', album: 'The Head and the Heart', duration: 284, coverUrl: '', genre: 'indie folk', mood: 'calm' },

  // --- ambient ---
  { id: 'a1', title: 'Weightless', artist: 'Marconi Union', album: 'Weightless', duration: 500, coverUrl: '', genre: 'ambient', mood: 'serene' },
  { id: 'a2', title: 'Abrasive', artist: 'Ratatat', album: 'LP4', duration: 316, coverUrl: '', genre: 'ambient', mood: 'energetic' },

  // --- rock ---
  { id: 'r1', title: 'Seven Nation Army', artist: 'The White Stripes', album: 'Elephant', duration: 232, coverUrl: '', genre: 'rock', mood: 'energetic' },
  { id: 'r2', title: 'Smells Like Teen Spirit', artist: 'Nirvana', album: 'Nevermind', duration: 301, coverUrl: '', genre: 'rock', mood: 'energetic' },
  { id: 'r3', title: 'Bohemian Rhapsody', artist: 'Queen', album: 'A Night at the Opera', duration: 355, coverUrl: '', genre: 'rock', mood: 'epic' },
  { id: 'r4', title: 'Back in Black', artist: 'AC/DC', album: 'Back in Black', duration: 255, coverUrl: '', genre: 'rock', mood: 'energetic' },
  { id: 'r5', title: 'Wonderwall', artist: 'Oasis', album: "(What's the Story) Morning Glory?", duration: 258, coverUrl: '', genre: 'rock', mood: 'calm' },

  // --- punk ---
  { id: 'p1', title: 'American Idiot', artist: 'Green Day', album: 'American Idiot', duration: 174, coverUrl: '', genre: 'punk', mood: 'energetic' },
  { id: 'p2', title: 'Blitzkrieg Bop', artist: 'Ramones', album: 'Ramones', duration: 133, coverUrl: '', genre: 'punk', mood: 'energetic' },
  { id: 'p3', title: 'Should I Stay or Should I Go', artist: 'The Clash', album: 'Combat Rock', duration: 192, coverUrl: '', genre: 'punk', mood: 'energetic' },

  // --- hiphop ---
  { id: 'h1', title: 'Lose Yourself', artist: 'Eminem', album: '8 Mile', duration: 326, coverUrl: '', genre: 'hiphop', mood: 'energetic' },
  { id: 'h2', title: 'Alright', artist: 'Kendrick Lamar', album: 'To Pimp a Butterfly', duration: 219, coverUrl: '', genre: 'hiphop', mood: 'energetic' },
  { id: 'h3', title: 'Sicko Mode', artist: 'Travis Scott', album: 'Astroworld', duration: 312, coverUrl: '', genre: 'hiphop', mood: 'energetic' },
  { id: 'h4', title: 'The Real Slim Shady', artist: 'Eminem', album: 'The Marshall Mathers LP', duration: 284, coverUrl: '', genre: 'hiphop', mood: 'energetic' },

  // --- alternative ---
  { id: 'alt1', title: 'Creep', artist: 'Radiohead', album: 'Pablo Honey', duration: 239, coverUrl: '', genre: 'alternative', mood: 'dreamy' },
  { id: 'alt2', title: 'Bitter Sweet Symphony', artist: 'The Verve', album: 'Urban Hymns', duration: 358, coverUrl: '', genre: 'alternative', mood: 'epic' },

  // --- electronic ---
  { id: 'e1', title: 'Strobe', artist: 'Deadmau5', album: 'For Lack of a Better Name', duration: 637, coverUrl: '', genre: 'electronic', mood: 'energetic' },
  { id: 'e2', title: 'Levels', artist: 'Avicii', album: 'True', duration: 214, coverUrl: '', genre: 'electronic', mood: 'energetic' },
  { id: 'e3', title: 'Sandstorm', artist: 'Darude', album: 'Before the Storm', duration: 226, coverUrl: '', genre: 'electronic', mood: 'energetic' },
  { id: 'e4', title: 'Opus', artist: 'Eric Prydz', album: 'Opus', duration: 540, coverUrl: '', genre: 'electronic', mood: 'epic' },

  // --- indie rock ---
  { id: 'ir1', title: 'Dashboard', artist: 'Modest Mouse', album: "We Were Dead", duration: 246, coverUrl: '', genre: 'indie rock', mood: 'energetic' },
  { id: 'ir2', title: 'Float On', artist: 'Modest Mouse', album: 'Good News', duration: 208, coverUrl: '', genre: 'indie rock', mood: 'calm' },
  { id: 'ir3', title: 'Take Me Out', artist: 'Franz Ferdinand', album: 'Franz Ferdinand', duration: 237, coverUrl: '', genre: 'indie rock', mood: 'energetic' },

  // --- pop ---
  { id: 'pop1', title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', duration: 200, coverUrl: '', genre: 'pop', mood: 'energetic' },
  { id: 'pop2', title: 'Levitating', artist: 'Dua Lipa', album: 'Future Nostalgia', duration: 203, coverUrl: '', genre: 'pop', mood: 'energetic' },
  { id: 'pop3', title: 'Shape of You', artist: 'Ed Sheeran', album: 'Divide', duration: 234, coverUrl: '', genre: 'pop', mood: 'cozy' },
  { id: 'pop4', title: 'Watermelon Sugar', artist: 'Harry Styles', album: 'Fine Line', duration: 174, coverUrl: '', genre: 'pop', mood: 'breezy' },

  // --- drum&bass ---
  { id: 'dnb1', title: 'Gold Dust', artist: 'DJ Fresh', album: 'Kryptonite', duration: 211, coverUrl: '', genre: 'drum&bass', mood: 'energetic' },
  { id: 'dnb2', title: 'Tarantula', artist: 'Pendulum', album: 'Hold Your Colour', duration: 331, coverUrl: '', genre: 'drum&bass', mood: 'energetic' },

  // --- house ---
  { id: 'ho1', title: 'One More Time', artist: 'Daft Punk', album: 'Discovery', duration: 320, coverUrl: '', genre: 'house', mood: 'energetic' },
  { id: 'ho2', title: 'Around the World', artist: 'Daft Punk', album: 'Homework', duration: 428, coverUrl: '', genre: 'house', mood: 'energetic' },
  { id: 'ho3', title: 'Lady (Hear Me Tonight)', artist: 'Modjo', album: 'Modjo', duration: 247, coverUrl: '', genre: 'house', mood: 'breezy' },

  // --- lofi ---
  { id: 'lo1', title: 'Snowman', artist: 'Idealism', album: 'Chillhop', duration: 142, coverUrl: '', genre: 'lofi', mood: 'breezy' },
  { id: 'lo2', title: "Jazzhop Cafe", artist: 'Kupla', album: 'Cafe', duration: 156, coverUrl: '', genre: 'lofi', mood: 'cozy' },

  // --- dream pop ---
  { id: 'dp1', title: 'Space Song', artist: 'Beach House', album: 'Depression Cherry', duration: 320, coverUrl: '', genre: 'dream pop', mood: 'dreamy' },
  { id: 'dp2', title: 'Myth', artist: 'Beach House', album: 'Bloom', duration: 258, coverUrl: '', genre: 'dream pop', mood: 'dreamy' },

  // --- acoustic ---
  { id: 'ac1', title: 'Fast Car', artist: 'Tracy Chapman', album: 'Tracy Chapman', duration: 285, coverUrl: '', genre: 'acoustic', mood: 'cozy' },
  { id: 'ac2', title: 'Let Her Go', artist: 'Passenger', album: 'All the Little Lights', duration: 252, coverUrl: '', genre: 'acoustic', mood: 'cozy' },

  // --- bossa nova ---
  { id: 'bn1', title: "The Girl from Ipanema", artist: 'Stan Getz & Astrud Gilberto', album: 'Getz/Gilberto', duration: 320, coverUrl: '', genre: 'bossa nova', mood: 'breezy' },
  { id: 'bn2', title: 'Corcovado', artist: 'Antonio Carlos Jobim', album: 'Wave', duration: 248, coverUrl: '', genre: 'bossa nova', mood: 'warm' },

  // --- classical ---
  { id: 'cl1', title: 'Clair de Lune', artist: 'Debussy', album: 'Suite Bergamasque', duration: 312, coverUrl: '', genre: 'classical', mood: 'serene' },
  { id: 'cl2', title: 'The Four Seasons: Spring', artist: 'Vivaldi', album: 'Four Seasons', duration: 212, coverUrl: '', genre: 'classical', mood: 'energetic' },

  // --- electro pop ---
  { id: 'ep1', title: 'Something About Us', artist: 'Daft Punk', album: 'Discovery', duration: 232, coverUrl: '', genre: 'electro pop', mood: 'dreamy' },

  // --- lounge ---
  { id: 'lg1', title: "Smooth Operator", artist: 'Sade', album: 'Diamond Life', duration: 297, coverUrl: '', genre: 'lounge', mood: 'chill' },
  { id: 'lg2', title: "No Ordinary Love", artist: 'Sade', album: 'Love Deluxe', duration: 361, coverUrl: '', genre: 'lounge', mood: 'warm' },
];
