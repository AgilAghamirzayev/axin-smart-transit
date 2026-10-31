package db.migration;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.flywaydb.core.api.migration.*;
public class V4__Import_official_network extends BaseJavaMigration {
    @Override public void migrate(Context context) throws Exception {
        var db=context.getConnection();
        try(var s=db.createStatement()) {
            s.execute("alter table vehicle add column path_index integer not null default 0");
            s.execute("alter table stop alter column name type varchar(300)");
            s.execute("create table official_route (route_id varchar(30) primary key references transit_route(id), definition text not null)");
            s.execute("create table official_stop (stop_id varchar(30) primary key references stop(id), definition text not null)");
            s.execute("create table network_metadata (id integer primary key, definition text not null)");
        }
        var mapper=new ObjectMapper();
        try(var input=getClass().getResourceAsStream("/network/official-network-v1.json")) {
            if(input==null) throw new IllegalStateException("Missing immutable network snapshot");
            var root=mapper.readTree(input);
            try(var stop=db.prepareStatement("insert into stop values (?,?,?,?)");
                var detail=db.prepareStatement("insert into official_stop values (?,?)")) {
                for(var item:root.get("stops")) {
                    stop.setString(1,item.get("id").asText()); stop.setString(2,item.get("name").asText());
                    stop.setDouble(3,item.get("latitude").asDouble()); stop.setDouble(4,item.get("longitude").asDouble()); stop.addBatch();
                    detail.setString(1,item.get("id").asText()); detail.setString(2,mapper.writeValueAsString(item)); detail.addBatch();
                }
                stop.executeBatch(); detail.executeBatch();
            }
            try(var route=db.prepareStatement("insert into transit_route values (?,?,?)");
                var detail=db.prepareStatement("insert into official_route values (?,?)");
                var state=db.prepareStatement("insert into route_state(route_id) values (?)")) {
                for(var item:root.get("routes")) {
                    route.setString(1,item.get("id").asText()); route.setString(2,item.get("name").asText());
                    route.setString(3,item.get("color").asText()); route.addBatch();
                    detail.setString(1,item.get("id").asText()); detail.setString(2,mapper.writeValueAsString(item)); detail.addBatch();
                    state.setString(1,item.get("id").asText()); state.addBatch();
                }
                route.executeBatch(); detail.executeBatch(); state.executeBatch();
            }
            try(var metadata=db.prepareStatement("insert into network_metadata values (1,?)")) {
                metadata.setString(1,mapper.writeValueAsString(root.get("metadata"))); metadata.executeUpdate();
            }
        }
    }
}
