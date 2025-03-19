SELECT
  c.creature_id,
  c.creature_name,
  c.faction_id AS creature_faction,
  col.color_name AS creature_color,
  ct.creature_type_name AS creature_type,
  f.faction_name
FROM
  (
    (
      (
        creatures c
        LEFT JOIN colors col ON ((c.color_id = (col.color_id) :: text))
      )
      LEFT JOIN creature_types ct ON (
        (c.creature_type_id = (ct.creature_type_id) :: text)
      )
    )
    LEFT JOIN factions f ON ((c.faction_id = (f.faction_id) :: text))
  );