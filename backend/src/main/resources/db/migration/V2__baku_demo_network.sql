-- Synthetic demonstration loops. These are NOT official Baku bus routes or surveyed stops.
insert into transit_route values ('D1', 'Mərkəz dairəsi', '#6757df'), ('D2', 'Bulvar xətti', '#159889'), ('D3', 'Şəhər bağlantısı', '#e29b35');
insert into stop values
('s1','28 May',40.3798,49.8484),('s2','Hökumət evi',40.3733,49.8534),
('s3','Sahil',40.3716,49.8435),('s4','Fəvvarələr meydanı',40.3712,49.8375),
('s5','Qış parkı',40.3775,49.8378),('s6','Port Baku',40.3763,49.8653),
('s7','Ağ Şəhər bulvarı',40.3792,49.8815),('s8','Xətai',40.3837,49.8725),
('s9','Şərq bazarı',40.3899,49.8535),('s10','Gənclik',40.4002,49.8521),
('s11','Dədə Qorqud parkı',40.3934,49.8458);
insert into route_stop values
('D1','s1',0),('D1','s2',1),('D1','s3',2),('D1','s4',3),('D1','s5',4),
('D2','s1',0),('D2','s2',1),('D2','s6',2),('D2','s7',3),('D2','s8',4),
('D3','s1',0),('D3','s9',1),('D3','s10',2),('D3','s11',3),('D3','s5',4);
insert into route_state(route_id) values ('D1'),('D2'),('D3');
