SELECT
  r.resource_id,
  r.world_id,
  r.resource_created_date,
  r.resource_quality,
  rt.resource_type_id,
  rt.resource_type_name,
  rc.resource_category_id,
  rc.resource_category_name,
  rv.resource_variety_id,
  rv.resource_variety_name
FROM
  (
    (
      (
        resources r
        LEFT JOIN resource_types rt ON (
          (r.resource_type_id = (rt.resource_type_id) :: text)
        )
      )
      LEFT JOIN resource_categories rc ON (
        (
          (rt.resource_category_id) :: text = (rc.resource_category_id) :: text
        )
      )
    )
    LEFT JOIN resource_varieties rv ON (
      (
        (rt.resource_variety_id) :: text = (rv.resource_variety_id) :: text
      )
    )
  );