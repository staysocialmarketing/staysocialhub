-- Lev was seeded as 'offline' by an earlier migration; correct to 'active'.
update agent_status set status = 'active' where id = 'lev';
