create table if not exists collectibles
(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    title varchar UNIQUE NOT NULL,
    number smallint NOT NULL,
    short_description varchar DEFAULT NULL,
    description text DEFAULT NULL,
    card_image text NOT NULL
);

create table if not exists owners
(
    owner_wallet varchar NOT NULL,
    collectible uuid NOT NULL constraint foreign_collectibles_key references collectibles,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
    primary key (owner_wallet)
);