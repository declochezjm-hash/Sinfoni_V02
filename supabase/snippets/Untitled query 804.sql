-- On transfère la table et ses dépendances dans le schéma public accessible
ALTER TABLE IF EXISTS app.projects SET SCHEMA public;
ALTER TABLE IF EXISTS app.workflow_steps SET SCHEMA public;
ALTER TABLE IF EXISTS app.documents SET SCHEMA public;