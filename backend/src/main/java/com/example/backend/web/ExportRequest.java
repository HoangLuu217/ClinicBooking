package com.example.backend.web;

import java.util.List;

public class ExportRequest {
    private String title;
    private List<String> lines;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public List<String> getLines() { return lines; }
    public void setLines(List<String> lines) { this.lines = lines; }
}