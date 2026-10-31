create table reserve_bus (
  id varchar(30) primary key,
  allowed_route_id varchar(30) not null references transit_route(id),
  capacity integer not null,
  status varchar(20) not null check (status in ('READY','ASSIGNED'))
);
-- Local simulation allocation, NOT an official vehicle/operator eligibility register.
insert into reserve_bus select 'RES-' || id || '-1', id, 60, 'READY' from transit_route;
insert into reserve_bus select 'RES-' || id || '-2', id, 60, 'READY' from transit_route;
insert into reserve_bus select 'RES-' || id || '-3', id, 60, 'READY' from transit_route;
