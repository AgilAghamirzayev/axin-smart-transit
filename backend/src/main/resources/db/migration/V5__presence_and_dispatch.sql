create table presence_session (
  session_id varchar(36) primary key, reporter_id varchar(36) not null unique,
  vehicle_id varchar(30) not null references vehicle(id),
  first_seen timestamp with time zone, last_seen timestamp with time zone not null,
  last_observed timestamp with time zone, fix_count integer not null default 0,
  verified boolean not null default false
);
create index presence_active on presence_session(vehicle_id, last_seen);
create table dispatch_order (
  request_id varchar(36) primary key, route_id varchar(30) not null references transit_route(id),
  path_index integer not null, vehicle_id varchar(30) not null references vehicle(id),
  created_at timestamp with time zone not null, operator_name varchar(100) not null
);
create index dispatch_route_time on dispatch_order(route_id, created_at);
