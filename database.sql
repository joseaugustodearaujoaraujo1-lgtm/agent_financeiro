create database agent_financeiro;
use agent_financeiro;

create table conversas (
	id_conversa int primary key auto_increment,
    nome varchar(40) not null,
    criado_em timestamp default now(),
    atualizado_em timestamp default now() on update now()
);

create table menssagens(
	id_menssagen int auto_increment primary key,
    role varchar(40) not null,
    content varchar(2000) not null,
    id_conversa int,
    constraint FK_id_conversa_menssagen foreign key (id_conversa) references conversas (id_conversa),
    criado_em timestamp default now(),
    atualizado_em timestamp default now() on update now()
);










