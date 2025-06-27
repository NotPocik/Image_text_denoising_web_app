--
-- PostgreSQL database dump
--

-- Dumped from database version 15.2
-- Dumped by pg_dump version 15.2

-- Started on 2025-06-27 17:03:09

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 215 (class 1259 OID 17022)
-- Name: serviceuser; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.serviceuser (
    userid integer NOT NULL,
    username character varying(20) NOT NULL,
    hashed_password character varying(255) NOT NULL
);


ALTER TABLE public.serviceuser OWNER TO postgres;

--
-- TOC entry 214 (class 1259 OID 17021)
-- Name: serviceuser_userid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.serviceuser_userid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.serviceuser_userid_seq OWNER TO postgres;

--
-- TOC entry 3327 (class 0 OID 0)
-- Dependencies: 214
-- Name: serviceuser_userid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.serviceuser_userid_seq OWNED BY public.serviceuser.userid;


--
-- TOC entry 3173 (class 2604 OID 17025)
-- Name: serviceuser userid; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.serviceuser ALTER COLUMN userid SET DEFAULT nextval('public.serviceuser_userid_seq'::regclass);


--
-- TOC entry 3321 (class 0 OID 17022)
-- Dependencies: 215
-- Data for Name: serviceuser; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.serviceuser (userid, username, hashed_password) FROM stdin;
6	lol	$2b$12$7rmAVV/iv5qYtTP5bQW3h..snNWJVz7cTIV8ZmkAucUHkKprK/ZZK
7	string	$2b$12$ydrjRpdTjYjN7K3Iu09QK.HTkCHBkUzCzOLpBwX6gF97O7Ex.Pdwy
8	123	$2b$12$ktmqXrEZE8MSMDbAxP.4gOnfU.Lvmfxfp/mPTO9NgUJNVmznBzCGa
\.


--
-- TOC entry 3328 (class 0 OID 0)
-- Dependencies: 214
-- Name: serviceuser_userid_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.serviceuser_userid_seq', 8, true);


--
-- TOC entry 3175 (class 2606 OID 17027)
-- Name: serviceuser serviceuser_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.serviceuser
    ADD CONSTRAINT serviceuser_pkey PRIMARY KEY (userid);


--
-- TOC entry 3177 (class 2606 OID 17029)
-- Name: serviceuser serviceuser_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.serviceuser
    ADD CONSTRAINT serviceuser_username_key UNIQUE (username);


-- Completed on 2025-06-27 17:03:09

--
-- PostgreSQL database dump complete
--

