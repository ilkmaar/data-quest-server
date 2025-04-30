SELECT
  gt.game_time_id,
  gt.game_time_number,
  d.day_id,
  d.day_number,
  d.day_name,
  tod.time_of_day_id,
  tod.time_of_day_name,
  s.season_id,
  s.season_name
FROM
  (
    (
      (
        game_times gt
        LEFT JOIN days d ON ((gt.day_id = d.day_id))
      )
      LEFT JOIN time_of_days tod ON ((gt.time_of_day_id = tod.time_of_day_id))
    )
    LEFT JOIN seasons s ON ((gt.season_id = s.season_id))
  );