-- A transaction lock makes cooldown and idempotency atomic across application instances.
create table report_write_lock (id integer primary key);
insert into report_write_lock values (1);
