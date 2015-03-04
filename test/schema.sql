/*==============================================================*/
/* Table: Company                                                */
/*==============================================================*/
create table Company
(
   Company_id            bigint not null auto_increment,
   name                  varchar(256),
   tel                   varchar(16),
   url                   varchar(256),
   _c_json               text,
   primary key (Company_id)
)
engine = InnoDB;

/*==============================================================*/
/* Table: Person                                                */
/*==============================================================*/
create table Person
(
   Person_id            bigint not null auto_increment,
   name                 varchar(64),
   dob                  date,
   gender               tinyint,
   workFor              bigint,
   _c_json              text,
   primary key (Person_id)
)
engine = InnoDB;

/*==============================================================*/
/* Table: PersonSQL                                              */
/*==============================================================*/
create table PersonSQL
(
   Person_id            bigint not null auto_increment,
   name                 varchar(64),
   dob                  date,
   gender               tinyint,
   workFor              bigint,
   primary key (Person_id)
)
engine = InnoDB;

/*==============================================================*/
/* Table: PersonDoc                                             */
/*==============================================================*/
create table PersonDoc
(
   id                   bigint not null auto_increment,
   name                 varchar(64),
   dob                  date,
   gender               tinyint,
   workFor              bigint,
   _c_json              text,
   primary key (id)
)
engine = InnoDB;

alter table Person add constraint FK_psnRcmp foreign key (workFor)
      references Company (Company_id) on delete restrict on update restrict;